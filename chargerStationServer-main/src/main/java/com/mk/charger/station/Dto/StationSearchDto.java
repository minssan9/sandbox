package com.mk.charger.station.Dto;

import lombok.Data;

@Data
public class StationSearchDto {
    private double radius;
    private String lat;
    private String lng;
}
