package com.voyagerss.financial.dto;

import com.google.gson.annotations.SerializedName;
import com.voyagerss.financial.domain.KrBankData;
import lombok.Data;

import java.util.List;

@Data
public class KrBankDataResponse {
    @SerializedName("StatisticSearch")
    KrBankDataResult krBankDataResult;

    @Data
    public class KrBankDataResult {
        @SerializedName("list_total_count")
        int list_total_count;
        @SerializedName("row")
        List<KrBankData> row;
    }
}

