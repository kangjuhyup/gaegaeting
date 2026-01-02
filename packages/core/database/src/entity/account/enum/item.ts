export enum ItemLedgerType {
    GRANT = "GRANT",     // 충전으로 지급(+)
    SPEND = "SPEND",     // 기능 사용(-)
    REVOKE = "REVOKE",   // 환불로 회수(-)
    ADJUST = "ADJUST",   // 운영 보정(+/-)
  }
  
  export enum ItemLedgerStatus {
    POSTED = "POSTED",
    CANCELED = "CANCELED",
  }
  
  export enum ItemReferenceType {
    PAYMENT = "PAYMENT",
    REFUND = "REFUND",
    FEATURE_USE = "FEATURE_USE",
    ADMIN = "ADMIN",
  }
  
  export enum ItemLotStatus {
    OPEN = "OPEN",
    DEPLETED = "DEPLETED",
    REVOKED = "REVOKED",
  }