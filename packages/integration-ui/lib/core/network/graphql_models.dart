import 'package:json_annotation/json_annotation.dart';

part 'graphql_models.g.dart';

@JsonSerializable(createFactory: false, includeIfNull: false)
class GraphqlRequest {
  const GraphqlRequest({
    required this.query,
    this.variables = const {},
    this.operationName,
  });

  final String query;
  final Map<String, dynamic> variables;
  final String? operationName;

  Map<String, dynamic> toJson() => _$GraphqlRequestToJson(this);
}

@JsonSerializable(createToJson: false)
class GraphqlResponse {
  const GraphqlResponse({this.data, this.errors});

  factory GraphqlResponse.fromJson(Map<String, dynamic> json) =>
      _$GraphqlResponseFromJson(json);

  final Map<String, dynamic>? data;
  final List<GraphqlError>? errors;
}

@JsonSerializable(createToJson: false)
class GraphqlError {
  const GraphqlError({required this.message, this.extensions});

  factory GraphqlError.fromJson(Map<String, dynamic> json) =>
      _$GraphqlErrorFromJson(json);

  final String message;
  final Map<String, dynamic>? extensions;
}
