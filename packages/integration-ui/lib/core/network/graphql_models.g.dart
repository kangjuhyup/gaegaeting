// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'graphql_models.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

Map<String, dynamic> _$GraphqlRequestToJson(GraphqlRequest instance) =>
    <String, dynamic>{
      'query': instance.query,
      'variables': instance.variables,
      'operationName': ?instance.operationName,
    };

GraphqlResponse _$GraphqlResponseFromJson(Map<String, dynamic> json) =>
    GraphqlResponse(
      data: json['data'] as Map<String, dynamic>?,
      errors: (json['errors'] as List<dynamic>?)
          ?.map((e) => GraphqlError.fromJson(e as Map<String, dynamic>))
          .toList(),
    );

GraphqlError _$GraphqlErrorFromJson(Map<String, dynamic> json) => GraphqlError(
  message: json['message'] as String,
  extensions: json['extensions'] as Map<String, dynamic>?,
);
