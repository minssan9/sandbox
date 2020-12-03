package com.mk.charger.station.Dto;

import lombok.Data;

import javax.xml.bind.annotation.*;
import java.util.List;

@Data
public class StationResponseFromGov {
    List<StationHeader> header;
    List<StationInfoFromGov> items;
}
