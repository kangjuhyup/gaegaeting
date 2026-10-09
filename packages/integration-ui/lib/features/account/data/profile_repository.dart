import 'dart:typed_data';
import 'dart:ui' as ui;

import '../../challenge/application/photo_controller.dart'
    show sanitizedPng, PhotoTransport;
import 'account_repository.dart';

const profileOperations = <String, String>{
  'updatePet': r'mutation UpdatePet($id: Int!, $input: UpdatePetInput!) { updatePet(id: $id, input: $input) { id } }',
  'deletePet': r'mutation DeletePet($id: Int!) { deletePet(id: $id) }',
  'certifyPet': r'mutation CertifyPet($id: Int!, $input: CertifyPetInput!) { certifyPet(id: $id, input: $input) { id isCertificated } }',
  'myProfileImageUploads': 'query UserImages { myProfileImageUploads { kind targetId imageNo status url updatedAt } }',
  'myPetImageUploads': r'query PetImages($petId: Int!) { myPetImageUploads(petId: $petId) { kind targetId imageNo status url updatedAt } }',
  'generatePresignedUrl': r'mutation ReserveUser($imageNo: Int!) { generatePresignedUrl(imageNo: $imageNo) { url expiresIn } }',
  'generatePetPresignedUrl': r'mutation ReservePet($petId: Int!, $imageNo: Int!) { generatePetPresignedUrl(petId: $petId, imageNo: $imageNo) { url expiresIn } }',
  'completeProfileImage': r'mutation CompleteUser($imageNo: Int!) { completeProfileImage(imageNo: $imageNo) { imageNo status url } }',
  'completePetImage': r'mutation CompletePet($petId: Int!, $imageNo: Int!) { completePetImage(petId: $petId, imageNo: $imageNo) { imageNo status url } }',
  'deleteProfileImage': r'mutation RemoveUser($imageNo: Int!) { deleteProfileImage(imageNo: $imageNo) }',
  'deletePetImage': r'mutation RemovePet($petId: Int!, $imageNo: Int!) { deletePetImage(petId: $petId, imageNo: $imageNo) }',
};
Future<Uint8List> prepareProfilePng(Uint8List bytes) async {
  if (bytes.isEmpty || bytes.length > 5 * 1024 * 1024) {
    throw const ApiFailure('원본 사진은 5MiB 이하여야 해요.');
  }
  final buffer = await ui.ImmutableBuffer.fromUint8List(bytes);
  try {
    final descriptor = await ui.ImageDescriptor.encoded(buffer);
    try {
      if (descriptor.width > 4096 || descriptor.height > 4096) {
        throw const ApiFailure('사진은 가로·세로 4096px 이하여야 해요.');
      }
    } finally {
      descriptor.dispose();
    }
  } finally {
    buffer.dispose();
  }
  return sanitizedPng(bytes);
}

class ProfileRepository {
  ProfileRepository({
    required this.account,
    required this.owner,
    required this.transport,
    required this.imageOrigin,
  });
  final AccountRepository account;
  final String? Function() owner;
  final PhotoTransport transport;
  final String imageOrigin;
  Future<dynamic> call(
    String operation, [
    Map<String, dynamic> variables = const {},
  ]) async {
    final who = owner();
    if (who == null) {
      throw const ApiFailure('로그인 후 이용해 주세요.', requiresLogin: true);
    }
    final d = await account.execute(
      account.gateway,
      profileOperations[operation]!,
      variables,
      guard: () => owner() == who,
    );
    if (d[operation] == null || d[operation] == false) {
      throw const ApiFailure('저장 결과를 확인할 수 없어요.');
    }
    return d[operation];
  }

  Future<void> upload(Uint8List bytes, int slot, {int? petId}) async {
    final who = owner();
    final origin = Uri.tryParse(imageOrigin);
    if (origin == null ||
        origin.scheme != 'https' ||
        origin.host.isEmpty ||
        origin.userInfo.isNotEmpty ||
        origin.query.isNotEmpty) {
      throw const ApiFailure('사진 저장소가 아직 설정되지 않았어요.');
    }
    if (slot < 0 || slot > 5) throw const ApiFailure('사진은 최대 6장까지 등록할 수 있어요.');
    final png = await prepareProfilePng(bytes);
    if (owner() != who || who == null) {
      throw const ApiFailure('계정이 변경됐어요.', requiresLogin: true);
    }
    final vars = {'imageNo': slot, 'petId': ?petId};
    final reservation = await call(
      petId == null ? 'generatePresignedUrl' : 'generatePetPresignedUrl',
      vars,
    ) as Map;
    final url = Uri.tryParse(reservation['url'] as String);
    if (url == null ||
        url.scheme != 'https' ||
        url.origin != origin.origin ||
        url.userInfo.isNotEmpty) {
      throw const ApiFailure('허용된 사진 업로드 주소가 아니에요.');
    }
    if (owner() != who) {
      throw const ApiFailure('계정이 변경됐어요.', requiresLogin: true);
    }
    await transport.put(url.toString(), png);
    if (owner() != who) {
      throw const ApiFailure('계정이 변경됐어요.', requiresLogin: true);
    }
    await call(
      petId == null ? 'completeProfileImage' : 'completePetImage',
      vars,
    );
  }
}
