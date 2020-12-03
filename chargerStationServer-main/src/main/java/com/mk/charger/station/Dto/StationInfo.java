package com.mk.charger.station.Dto;

import com.mk.charger.station.Domain.Station;
import lombok.Data;

@Data
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
