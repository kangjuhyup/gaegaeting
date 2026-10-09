import 'dart:convert';

import 'package:crypto/crypto.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

String proofDigest(String proof) =>
    sha256.convert(utf8.encode(proof)).toString();

// Only the secure journal holds evidence. Never serialize these records to logs.
class PurchaseRecord {
  const PurchaseRecord({
    required this.preparedId,
    required this.ownerId,
    required this.productId,
    required this.provider,
    required this.accountToken,
    this.proof,
    this.digest,
    this.transactionId,
    this.settled = false,
  });
  factory PurchaseRecord.fromJson(Map<String, dynamic> j) => PurchaseRecord(
    preparedId: j['preparedId'] as String,
    ownerId: j['ownerId'] as String,
    productId: j['productId'] as String,
    provider: j['provider'] as String,
    accountToken: j['accountToken'] as String,
    proof: j['proof'] as String?,
    digest: j['digest'] as String?,
    transactionId: j['transactionId'] as String?,
    settled: j['settled'] as bool? ?? false,
  );
  final String preparedId, ownerId, productId, provider, accountToken;
  final String? proof, digest, transactionId;
  final bool settled;
  PurchaseRecord evidence(String value, String? id) => PurchaseRecord(
    preparedId: preparedId,
    ownerId: ownerId,
    productId: productId,
    provider: provider,
    accountToken: accountToken,
    proof: value,
    digest: proofDigest(value),
    transactionId: id,
  );
  PurchaseRecord complete() => PurchaseRecord(
    preparedId: preparedId,
    ownerId: ownerId,
    productId: productId,
    provider: provider,
    accountToken: accountToken,
    digest: digest,
    transactionId: transactionId,
    settled: true,
  );
  Map<String, dynamic> toJson() => {
    'preparedId': preparedId,
    'ownerId': ownerId,
    'productId': productId,
    'provider': provider,
    'accountToken': accountToken,
    'proof': proof,
    'digest': digest,
    'transactionId': transactionId,
    'settled': settled,
  };
}

abstract interface class PurchaseJournal {
  Future<List<PurchaseRecord>> read();
  Future<void> write(List<PurchaseRecord> records);
}

class SecurePurchaseJournal implements PurchaseJournal {
  const SecurePurchaseJournal(
    this.namespace, {
    this.storage = const FlutterSecureStorage(
      aOptions: AndroidOptions(
        storageNamespace: 'gaegaeting_payment_v1',
        resetOnError: false,
      ),
      iOptions: IOSOptions(
        accountName: 'gaegaeting.payment.v1',
        accessibility: KeychainAccessibility.first_unlock_this_device,
      ),
    ),
  });
  final String namespace;
  final FlutterSecureStorage storage;
  String get key => 'gaegaeting.payment.v1.${proofDigest(namespace)}';
  @override
  Future<List<PurchaseRecord>> read() async {
    final value = await storage.read(key: key);
    if (value == null) return [];
    // Corruption must stop new purchases, never silently discard recovery data.
    return (jsonDecode(value) as List)
        .map((e) => PurchaseRecord.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  @override
  Future<void> write(List<PurchaseRecord> records) => storage.write(
    key: key,
    value: jsonEncode(records.map((e) => e.toJson()).toList()),
  );
}
