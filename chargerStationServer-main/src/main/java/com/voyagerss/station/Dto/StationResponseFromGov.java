package com.voyagerss.station.Dto;

import lombok.Data;

import java.util.List;

@Data
public class StationResponseFromGov {
    List<StationHeader> header;
    List<StationInfoFromGov> items;
}
