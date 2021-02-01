package com.voyagerss.station.Dto;

import com.voyagerss.station.Domain.Station;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode
public class StationInfo extends Station {
    String statNm;
    String statId;
    String chgerId;
    String chgerType;
    String addr;
    double lat;
    double lng;
    String useTime;
    String busiId;
    String busiNm;
    String busiCall;
    int stat;
    String statUpdDt;
    String powerType;
}
