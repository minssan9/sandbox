package com.mk.charger.station.Dto;

import lombok.Data;

import javax.xml.bind.annotation.*;
import java.util.List;

@Data
public class StationHeader {
    String resultCode;
    String resultMsg;
    String totalCount;
    String resultCount;
    String pageNo;
    String pageSize;
}
