package com.voyagerss.financial.dto;

import lombok.Data;
import lombok.NoArgsConstructor;

@Data
public
class KrBankRequest {
     String serviceName="";
     String url = "http://ecos.bok.or.kr/api";
     String authKey = "";
     String requestType = "json";
     String language = "kr";
     String period = "DD";

     String statisticCode;


     String option1;
     String option2;
     String option3;
     String queryStartDate;
     String queryEndDate;
     Long reqStartCount;
     Long reqEndCount;


     public KrBankRequest(String statisticCode, String option1, String option2, String option3, String queryStartDate, String queryEndDate, Long reqStartCount, Long reqEndCount) {
          this.statisticCode = statisticCode;
          this.option1 = option1;
          this.option2 = option2;
          this.option3 = option3;
          this.queryStartDate = queryStartDate;
          this.queryEndDate = queryEndDate;
          this.reqStartCount = reqStartCount;
          this.reqEndCount = reqEndCount;
     }
}