import 'package:auth_platform_flutter/auth_platform_flutter.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/design/app_theme.dart';
import '../../../core/design/widgets.dart';
import '../application/api_session.dart';
import '../application/location_sync.dart';
import '../data/account_repository.dart';

class ApiError extends StatelessWidget {
  const ApiError(this.message, {super.key});
  final String? message;
  @override
  Widget build(BuildContext context) => message == null
      ? const SizedBox.shrink()
      : Padding(
          padding: const EdgeInsets.symmetric(vertical: 16),
          child: Semantics(
            liveRegion: true,
            child: Text(
              message!,
              style: AppText.small.copyWith(color: AppColors.primary),
            ),
          ),
        );
}

class ApiLoginScreen extends ConsumerStatefulWidget {
  const ApiLoginScreen({super.key});
  @override
  ConsumerState<ApiLoginScreen> createState() => _ApiLoginScreenState();
}

class ApiLocationStatus extends ConsumerWidget {
  const ApiLocationStatus({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final location = ref.watch(locationSyncProvider);
    if (location.isLoading) {
      return const Padding(
        padding: EdgeInsets.symmetric(vertical: 16),
        child: Text('현재 위치로 산책 친구를 찾고 있어요…', style: AppText.small),
      );
    }
    if (location.hasError) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ApiError(apiErrorMessage(location.error!)),
          TextButton(
            onPressed: () => ref.read(locationSyncProvider.notifier).sync(),
            child: const Text('위치·추천 다시 시도'),
          ),
        ],
      );
    }
    return const SizedBox.shrink();
  }
}

class _ApiLoginScreenState extends ConsumerState<ApiLoginScreen> {
  bool _busy = false;
  String? _error;
  Future<void> _signIn() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final account = await ref.read(apiSessionProvider.notifier).signIn();
      if (mounted) {
        final returnTo = GoRouterState.of(context)
            .uri
            .queryParameters['returnTo'];
        context.go(
          returnTo != null && returnTo.startsWith('/api/challenge')
              ? returnTo
              : account.destination,
        );
      }
    } on AuthProtocolException catch (e) {
      if (mounted && e.code != 'user_cancelled') {
        setState(() => _error = '로그인을 완료하지 못했어요. 다시 시도해 주세요.');
      }
    } catch (e) {
      if (mounted) setState(() => _error = apiErrorMessage(e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final session = ref.watch(apiSessionProvider);
    final account = session.asData?.value;
    return FlowScreen(
      title: '로그인',
      canGoBack: false,
      footer: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (account != null) ...[
            FlowButton(
              '계속하기',
              onPressed: _busy ? null : () => context.go(account.destination),
            ),
            const SizedBox(height: 12),
          ],
          FlowButton(
            _busy ? '로그인 중…' : '아이디로 로그인',
            onPressed: _busy || session.isLoading || kIsWeb ? null : _signIn,
          ),
          const SizedBox(height: 12),
          FlowButton(
            '계정이 없나요? 회원가입',
            secondary: true,
            onPressed: _busy ? null : () => context.push('/api/signup'),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const FlowHeading('다시 만나 반가워요', description: '가입한 방법으로 로그인해 주세요.'),
          const SizedBox(height: 16),
          Text(
            account == null
                ? '나와 강아지의 프로필을 등록하면\n산책 친구를 추천받을 수 있어요.'
                : '${account.profile?.nickname ?? '회원'}님, 이어서 시작해 볼까요?',
            style: AppText.small,
          ),
          if (account != null) const ApiLocationStatus(),
          if (session.isLoading)
            const Padding(
              padding: EdgeInsets.all(24),
              child: CircularProgressIndicator(),
            ),
          if (kIsWeb)
            const ApiError(
              'API 로그인은 Android·iOS 앱에서 이용해 주세요. 웹에서는 디자인을 미리 볼 수 있어요.',
            ),
          ApiError(
            _error ??
                (session.hasError ? apiErrorMessage(session.error!) : null),
          ),
          if (session.hasError)
            TextButton(
              onPressed: () => ref.invalidate(apiSessionProvider),
              child: const Text('연결 다시 확인'),
            ),
        ],
      ),
    );
  }
}

class ApiSignupScreen extends ConsumerStatefulWidget {
  const ApiSignupScreen({super.key});
  @override
  ConsumerState<ApiSignupScreen> createState() => _ApiSignupScreenState();
}

class _ApiSignupScreenState extends ConsumerState<ApiSignupScreen> {
  final _username = TextEditingController(),
      _password = TextEditingController(),
      _email = TextEditingController();
  final _name = TextEditingController(),
      _phone = TextEditingController(),
      _birth = TextEditingController();
  String _gender = 'FEMALE';
  bool _terms = false, _busy = false, _done = false;
  String? _error;
  Future<void> _register() async {
    final birthday = DateTime.tryParse(_birth.text);
    final today = DateTime.now();
    final adultDate = DateTime(today.year - 18, today.month, today.day);
    if (!RegExp(r'^[A-Za-z0-9_.-]{3,64}$').hasMatch(_username.text.trim()) ||
        _password.text.length < 8 ||
        !RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$').hasMatch(_email.text.trim()) ||
        _name.text.trim().isEmpty ||
        !RegExp(r'^010\d{8}$').hasMatch(_phone.text) ||
        birthday == null ||
        !RegExp(r'^\d{4}-\d{2}-\d{2}$').hasMatch(_birth.text) ||
        birthday.isAfter(adultDate)) {
      setState(
        () => _error = '필수 정보를 확인해 주세요. 아이디는 영문·숫자·기호 3~64자, 비밀번호는 8자 이상이며 만 18세 이상만 가입할 수 있어요.',
      );
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ref.read(accountRepositoryProvider).register({
        'termsVersion': '2026-09-01',
        'termsAgreed': _terms,
        'username': _username.text.trim(),
        'password': _password.text,
        'email': _email.text.trim(),
        'phone': _phone.text,
        'name': _name.text.trim(),
        'birthDate': _birth.text,
        'gender': _gender,
      });
      _password.clear();
      if (mounted) setState(() => _done = true);
    } catch (e) {
      if (mounted) setState(() => _error = apiErrorMessage(e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  void dispose() {
    for (final c in [_username, _password, _email, _name, _phone, _birth]) {
      c.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => FlowScreen(
    title: '회원가입',
    backPath: '/api/login',
    footer: FlowButton(
      _done
          ? '로그인하기'
          : _busy
          ? '가입 중…'
          : '회원가입 완료',
      onPressed: _busy
          ? null
          : _done
          ? () => context.go('/api/login')
          : _terms
          ? _register
          : null,
    ),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        FlowHeading(
          _done ? '가입이 완료됐어요' : '함께 걷는 친구를 만나요',
          description: _done ? '가입한 아이디로 로그인해 주세요.' : '계정과 본인 정보를 입력해 주세요.',
        ),
        if (!_done) ...[
          const SizedBox(height: 16),
          const SoftCard(
            child: Text(
              '로컬 개발 환경에서는 본인 확인을 모의 처리해요. 문자 인증은 전송되지 않아요.',
              style: AppText.caption,
            ),
          ),
          const SizedBox(height: 16),
          FlowField('아이디', controller: _username, maxLength: 50),
          const SizedBox(height: 16),
          FlowField(
            '비밀번호',
            controller: _password,
            obscureText: true,
            hint: '8자 이상',
          ),
          const SizedBox(height: 16),
          FlowField(
            '이메일',
            controller: _email,
            keyboardType: TextInputType.emailAddress,
          ),
          const SizedBox(height: 16),
          FlowField('이름', controller: _name, maxLength: 50),
          const SizedBox(height: 16),
          FlowField(
            '생년월일',
            controller: _birth,
            hint: '1995-01-01',
            maxLength: 10,
            keyboardType: TextInputType.datetime,
          ),
          const SizedBox(height: 16),
          DropdownButtonFormField<String>(
            initialValue: _gender,
            decoration: const InputDecoration(labelText: '성별'),
            items: const [
              DropdownMenuItem(value: 'FEMALE', child: Text('여성')),
              DropdownMenuItem(value: 'MALE', child: Text('남성')),
            ],
            onChanged: _busy ? null : (v) => setState(() => _gender = v!),
          ),
          const SizedBox(height: 16),
          FlowField(
            '휴대폰 번호',
            controller: _phone,
            digitsOnly: true,
            maxLength: 11,
            keyboardType: TextInputType.phone,
          ),
          const SizedBox(height: 16),
          FlowCheck(
            '서비스 이용약관에 동의합니다 (필수)',
            value: _terms,
            onChanged: (v) => setState(() => _terms = v),
          ),
        ],
        ApiError(_error),
      ],
    ),
  );
}

class ApiAccountGate extends ConsumerWidget {
  const ApiAccountGate({super.key, required this.builder});
  final Widget Function(AccountSnapshot) builder;
  @override
  Widget build(BuildContext context, WidgetRef ref) => ref
      .watch(apiSessionProvider)
      .when(
        data: (account) =>
            account == null ? const ApiLoginScreen() : builder(account),
        loading: () => const FlowScreen(
          title: '개개팅',
          canGoBack: false,
          child: Center(child: CircularProgressIndicator()),
        ),
        error: (error, stack) => const ApiLoginScreen(),
      );
}
