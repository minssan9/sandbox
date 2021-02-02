package com.voyagerss.station.Dto;

import com.voyagerss.station.Domain.Station;
import lombok.Data;

import java.util.List;

@Data
public class StationResponseFromGov {
    List<StationHeader> header;
    List<StationInfoFromGov> items;

    @Data
    public class StationHeader {
        String resultCode;
        String resultMsg;
        String totalCount;
        String resultCount;
        String pageNo;
        String pageSize;
    }


    @Data
    public class StationInfoFromGov {
        List<Station> item;
    }
}
