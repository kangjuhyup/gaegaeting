import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/design/app_theme.dart';
import '../../../core/design/widgets.dart';
import '../../flow/application/flow_controller.dart';

String _loginDestination(FlowState state) => !state.profileSaved
    ? '/onboarding/profile'
    : !state.petSaved
    ? '/onboarding/pet'
    : '/main';

bool _validPhone(String value) => RegExp(r'^010\d{8}$').hasMatch(value);

class SignupScreen extends StatelessWidget {
  const SignupScreen({super.key});

  @override
  Widget build(BuildContext context) => FlowScreen(
    title: '회원가입',
    canGoBack: false,
    footer: Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        FlowButton(
          '카카오로 회원가입',
          kakao: true,
          onPressed: () => context.push('/signup/agreements'),
        ),
        const SizedBox(height: 8),
        FlowButton(
          '휴대폰 번호로 회원가입',
          onPressed: () => context.push('/signup/phone'),
        ),
      ],
    ),
    child: const Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        FlowHeading(
          '함께 걷는 친구를 만나요',
          description: '나와 우리 강아지에게 잘 맞는\n산책 친구를 찾아보세요.',
        ),
        SizedBox(height: 16),
        FlowPill('개개팅에 처음 오셨나요?'),
        SizedBox(height: 16),
        Text('가입 방법을 선택해 주세요.', style: AppText.small),
      ],
    ),
  );
}

class LoginScreen extends ConsumerWidget {
  const LoginScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) => FlowScreen(
    title: '로그인',
    footer: Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        FlowButton(
          '카카오로 로그인',
          kakao: true,
          onPressed: () =>
              context.go(_loginDestination(ref.read(flowProvider))),
        ),
        const SizedBox(height: 8),
        FlowButton(
          '휴대폰 번호로 로그인',
          onPressed: () => context.push('/login/phone'),
        ),
        const SizedBox(height: 8),
        FlowButton(
          '계정이 없나요? 회원가입',
          secondary: true,
          onPressed: () => context.go('/'),
        ),
      ],
    ),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const FlowHeading('다시 만나 반가워요', description: '가입한 방법으로 로그인해 주세요.'),
        const SizedBox(height: 16),
        Text(
          '나와 강아지의 프로필을 등록하면\n산책 친구를 추천받을 수 있어요.',
          style: AppText.small.copyWith(color: AppColors.secondary),
        ),
      ],
    ),
  );
}

class PhoneSignupScreen extends ConsumerStatefulWidget {
  const PhoneSignupScreen({super.key});

  @override
  ConsumerState<PhoneSignupScreen> createState() => _PhoneSignupScreenState();
}

class _PhoneSignupScreenState extends ConsumerState<PhoneSignupScreen> {
  late final TextEditingController _phone;

  @override
  void initState() {
    super.initState();
    _phone = TextEditingController(text: ref.read(flowProvider).phone);
  }

  @override
  void dispose() {
    _phone.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => FlowScreen(
    title: '휴대폰 번호로 회원가입',
    footer: FlowButton(
      '인증번호 받기',
      onPressed: _validPhone(_phone.text)
          ? () {
              ref.read(flowProvider.notifier).setPhone(_phone.text);
              context.push('/signup/verify');
            }
          : null,
    ),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const FlowHeading('휴대폰 번호를 입력해 주세요', description: '인증번호를 보내드릴게요.'),
        const SizedBox(height: 16),
        FlowField(
          '휴대폰 번호',
          controller: _phone,
          hint: '01000000000',
          keyboardType: TextInputType.phone,
          digitsOnly: true,
          maxLength: 11,
          onChanged: (_) => setState(() {}),
        ),
        const SizedBox(height: 12),
        Text(
          '본인 명의의 휴대폰 번호로 가입해 주세요.',
          style: AppText.caption.copyWith(color: AppColors.secondary),
        ),
      ],
    ),
  );
}

/// This UI preview accepts 123456; no SMS or authentication request is sent.
class PhoneVerificationScreen extends ConsumerStatefulWidget {
  const PhoneVerificationScreen({super.key});

  @override
  ConsumerState<PhoneVerificationScreen> createState() =>
      _PhoneVerificationScreenState();
}

class _PhoneVerificationScreenState
    extends ConsumerState<PhoneVerificationScreen> {
  final _code = TextEditingController();
  Timer? _timer;
  int _seconds = 180;
  String? _error;

  @override
  void initState() {
    super.initState();
    _startTimer();
  }

  void _startTimer() {
    _timer?.cancel();
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (!mounted) return;
      setState(() => _seconds--);
      if (_seconds == 0) timer.cancel();
    });
  }

  void _resend() {
    setState(() {
      _seconds = 180;
      _error = null;
      _code.clear();
    });
    _startTimer();
  }

  void _verify() {
    if (_code.text != '123456') {
      setState(() => _error = '인증번호가 맞지 않아요. 다시 확인해 주세요.');
      return;
    }
    context.push('/signup/agreements');
  }

  @override
  void dispose() {
    _timer?.cancel();
    _code.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => FlowScreen(
    title: '휴대폰 인증',
    backPath: '/signup/phone',
    footer: FlowButton(
      '인증하고 계속하기',
      onPressed: _seconds > 0 && _code.text.length == 6 ? _verify : null,
    ),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        FlowHeading(
          '인증번호를 입력해 주세요',
          description:
              '${ref.watch(flowProvider).phone.isEmpty ? '01000000000' : ref.watch(flowProvider).phone}로 보냈어요.',
        ),
        const SizedBox(height: 16),
        FlowField(
          '인증번호',
          controller: _code,
          hint: '123456',
          keyboardType: TextInputType.number,
          digitsOnly: true,
          maxLength: 6,
          error: _error,
          onChanged: (_) => setState(() => _error = null),
        ),
        const SizedBox(height: 12),
        _CodeValidity(seconds: _seconds),
        const SizedBox(height: 16),
        FlowButton('인증번호 다시 받기', secondary: true, onPressed: _resend),
      ],
    ),
  );
}

class _CodeValidity extends StatelessWidget {
  const _CodeValidity({required this.seconds});
  final int seconds;

  @override
  Widget build(BuildContext context) => Text(
    seconds == 0
        ? '인증번호가 만료됐어요. 다시 받아 주세요.'
        : '인증번호 유효시간 ${(seconds ~/ 60).toString().padLeft(2, '0')}:${(seconds % 60).toString().padLeft(2, '0')}',
    style: AppText.caption.copyWith(
      color: seconds == 0 ? AppColors.primary : AppColors.secondary,
    ),
  );
}

class AgreementsScreen extends ConsumerStatefulWidget {
  const AgreementsScreen({super.key});

  @override
  ConsumerState<AgreementsScreen> createState() => _AgreementsScreenState();
}

class _AgreementsScreenState extends ConsumerState<AgreementsScreen> {
  bool _terms = true;
  bool _privacy = true;
  late bool _marketing;

  @override
  void initState() {
    super.initState();
    _marketing = ref.read(flowProvider).marketing;
  }

  @override
  Widget build(BuildContext context) => FlowScreen(
    title: '가입 동의',
    footer: FlowButton(
      '가입 완료하고 로그인',
      onPressed: _terms && _privacy
          ? () {
              ref.read(flowProvider.notifier).setMarketing(_marketing);
              context.go('/login');
            }
          : null,
    ),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const FlowHeading(
          '개개팅 이용에 동의해 주세요',
          description: '필수 항목에 동의하면 가입할 수 있어요.',
        ),
        const SizedBox(height: 16),
        FlowCheck(
          '서비스 이용약관 동의 (필수)',
          value: _terms,
          onChanged: (v) => setState(() => _terms = v),
        ),
        const SizedBox(height: 8),
        FlowCheck(
          '개인정보 수집·이용 동의 (필수)',
          value: _privacy,
          onChanged: (v) => setState(() => _privacy = v),
        ),
        const SizedBox(height: 8),
        FlowCheck(
          '마케팅 메시지 수신 동의 (선택)',
          value: _marketing,
          onChanged: (v) => setState(() => _marketing = v),
        ),
        const SizedBox(height: 16),
        Text(
          '마케팅 소식 수신에 동의하지 않아도\n회원가입과 서비스 이용이 가능해요.',
          style: AppText.small.copyWith(color: AppColors.secondary),
        ),
      ],
    ),
  );
}

class PhoneLoginScreen extends ConsumerStatefulWidget {
  const PhoneLoginScreen({super.key});

  @override
  ConsumerState<PhoneLoginScreen> createState() => _PhoneLoginScreenState();
}

class _PhoneLoginScreenState extends ConsumerState<PhoneLoginScreen> {
  late final TextEditingController _phone;
  final _code = TextEditingController();
  String? _sentPhone, _error;
  int _seconds = 0;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _phone = TextEditingController(text: ref.read(flowProvider).phone);
  }

  void _sendCode() {
    _timer?.cancel();
    setState(() {
      _sentPhone = _phone.text;
      _seconds = 180;
      _error = null;
      _code.clear();
    });
    ref.read(flowProvider.notifier).setPhone(_phone.text);
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (!mounted) return;
      setState(() => _seconds--);
      if (_seconds == 0) timer.cancel();
    });
  }

  void _login() {
    if (_code.text != '123456') {
      setState(() => _error = '인증번호가 맞지 않아요. 다시 확인해 주세요.');
      return;
    }
    context.go(_loginDestination(ref.read(flowProvider)));
  }

  @override
  void dispose() {
    _timer?.cancel();
    _phone.dispose();
    _code.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => FlowScreen(
    title: '휴대폰 번호로 로그인',
    backPath: '/login',
    footer: FlowButton(
      '인증하고 로그인',
      onPressed:
          _validPhone(_phone.text) &&
              _sentPhone == _phone.text &&
              _seconds > 0 &&
              _code.text.length == 6
          ? _login
          : null,
    ),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const FlowHeading(
          '휴대폰 번호로 로그인해요',
          description: '인증번호로 간편하게 로그인할 수 있어요.',
        ),
        const SizedBox(height: 16),
        FlowField(
          '휴대폰 번호',
          controller: _phone,
          hint: '01000000000',
          keyboardType: TextInputType.phone,
          digitsOnly: true,
          maxLength: 11,
          onChanged: (_) => setState(() => _error = null),
        ),
        const SizedBox(height: 16),
        FlowButton(
          _sentPhone == null ? '인증번호 받기' : '인증번호 다시 받기',
          secondary: true,
          onPressed: _validPhone(_phone.text) ? _sendCode : null,
        ),
        const SizedBox(height: 16),
        FlowField(
          '인증번호',
          controller: _code,
          hint: '123456',
          keyboardType: TextInputType.number,
          digitsOnly: true,
          maxLength: 6,
          error: _error,
          onChanged: (_) => setState(() => _error = null),
        ),
        const SizedBox(height: 12),
        if (_sentPhone != null && _sentPhone == _phone.text)
          _CodeValidity(seconds: _seconds)
        else
          Text(
            '인증번호를 받은 후 입력해 주세요.',
            style: AppText.caption.copyWith(color: AppColors.secondary),
          ),
      ],
    ),
  );
}

class ProfileRegistrationScreen extends ConsumerStatefulWidget {
  const ProfileRegistrationScreen({super.key});

  @override
  ConsumerState<ProfileRegistrationScreen> createState() =>
      _ProfileRegistrationScreenState();
}

class _ProfileRegistrationScreenState
    extends ConsumerState<ProfileRegistrationScreen> {
  late final TextEditingController _nickname, _region, _introduction;

  @override
  void initState() {
    super.initState();
    final state = ref.read(flowProvider);
    _nickname = TextEditingController(text: state.nickname);
    _region = TextEditingController(text: state.region);
    _introduction = TextEditingController(text: state.introduction);
  }

  @override
  void dispose() {
    _nickname.dispose();
    _region.dispose();
    _introduction.dispose();
    super.dispose();
  }

  void _save() {
    ref
        .read(flowProvider.notifier)
        .saveProfile(
          nickname: _nickname.text.trim(),
          region: _region.text.trim(),
          introduction: _introduction.text.trim(),
        );
    context.push('/onboarding/pet');
  }

  @override
  Widget build(BuildContext context) => FlowScreen(
    title: '내 프로필 등록',
    backPath: '/login',
    footer: FlowButton(
      '저장하고 강아지 등록',
      onPressed:
          _nickname.text.trim().isNotEmpty && _region.text.trim().isNotEmpty
          ? _save
          : null,
    ),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const FlowPill('프로필 등록 · 1/2'),
        const SizedBox(height: 16),
        const FlowHeading('나를 소개해 주세요', description: '친구들에게 보여줄 내 프로필이에요.'),
        const SizedBox(height: 16),
        Row(
          children: [
            Container(
              width: 80,
              height: 80,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: AppColors.peach,
                borderRadius: BorderRadius.circular(20),
              ),
              child: Text(
                '민',
                style: AppText.heading.copyWith(color: AppColors.primary),
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Text(
                '프로필 사진은 나중에 추가해도 돼요.',
                style: AppText.small.copyWith(color: AppColors.secondary),
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        FlowField(
          '닉네임',
          controller: _nickname,
          onChanged: (_) => setState(() {}),
        ),
        const SizedBox(height: 16),
        FlowField(
          '활동 지역',
          controller: _region,
          onChanged: (_) => setState(() {}),
        ),
        const SizedBox(height: 16),
        FlowField('한 줄 소개 (선택)', controller: _introduction),
      ],
    ),
  );
}

class PetRegistrationScreen extends ConsumerStatefulWidget {
  const PetRegistrationScreen({super.key});

  @override
  ConsumerState<PetRegistrationScreen> createState() =>
      _PetRegistrationScreenState();
}

class _PetRegistrationScreenState extends ConsumerState<PetRegistrationScreen> {
  late final TextEditingController _name, _breed, _age;
  late String _sex;

  @override
  void initState() {
    super.initState();
    final state = ref.read(flowProvider);
    _name = TextEditingController(text: state.petName);
    _breed = TextEditingController(text: state.breed);
    _age = TextEditingController(text: state.age);
    _sex = state.sex;
  }

  @override
  void dispose() {
    _name.dispose();
    _breed.dispose();
    _age.dispose();
    super.dispose();
  }

  bool get _valid =>
      _name.text.trim().isNotEmpty &&
      _breed.text.trim().isNotEmpty &&
      RegExp(r'^\d{1,2}\s*살?$').hasMatch(_age.text.trim());

  void _save() {
    final age = _age.text.trim().replaceAll(' ', '');
    ref
        .read(flowProvider.notifier)
        .savePet(
          name: _name.text.trim(),
          breed: _breed.text.trim(),
          age: age.endsWith('살') ? age : '$age살',
          sex: _sex,
        );
    context.go('/main');
  }

  @override
  Widget build(BuildContext context) => FlowScreen(
    title: '강아지 등록',
    backPath: '/onboarding/profile',
    footer: FlowButton('등록 완료하고 시작하기', onPressed: _valid ? _save : null),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const FlowPill('프로필 등록 · 2/2'),
        const SizedBox(height: 16),
        const FlowHeading(
          '우리 강아지도 소개해 주세요',
          description: '잘 맞는 산책 친구를 찾을 수 있어요.',
        ),
        const SizedBox(height: 16),
        Row(
          children: [
            const SizedBox(
              width: 80,
              height: 80,
              child: PetPhoto(ownPet: true, height: 80, radius: 40),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Text(
                '${_name.text.trim().isEmpty ? '강아지' : _name.text.trim()}의 프로필 사진',
                style: AppText.small.copyWith(color: AppColors.secondary),
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        FlowField(
          '강아지 이름',
          controller: _name,
          onChanged: (_) => setState(() {}),
        ),
        const SizedBox(height: 16),
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: FlowField(
                '품종',
                controller: _breed,
                onChanged: (_) => setState(() {}),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: FlowField(
                '나이',
                controller: _age,
                onChanged: (_) => setState(() {}),
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        const Text('성별', style: AppText.small),
        const SizedBox(height: 8),
        Row(
          children: [
            for (final sex in ['수컷', '암컷']) ...[
              if (sex == '암컷') const SizedBox(width: 8),
              FlowChoice(
                label: sex,
                selected: _sex == sex,
                onTap: () => setState(() => _sex = sex),
              ),
            ],
          ],
        ),
      ],
    ),
  );
}
