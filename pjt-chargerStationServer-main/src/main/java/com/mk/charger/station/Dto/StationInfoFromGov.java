package com.mk.charger.station.Dto;

import com.mk.charger.station.Domain.Station;
import lombok.Data;

import javax.xml.bind.annotation.XmlAccessType;
import javax.xml.bind.annotation.XmlAccessorType;
import javax.xml.bind.annotation.XmlElement;
import javax.xml.bind.annotation.XmlRootElement;
import java.util.List;

@Data
public class StationInfoFromGov {
    List<Station> item;
}
