package com.voyagerss.station.Dto;

import com.voyagerss.station.Domain.Station;
import lombok.Data;

import java.util.List;

@Data
public class StationInfoFromGov {
    List<Station> item;
}
