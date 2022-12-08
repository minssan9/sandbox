package com.minssan9.korbit;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class TargetData {
    private String open;
    private String close;
    private String high;
    private String low;
    private long start;
    private long end;
    private String average;
    private String weighted_average;
    private String volume;

}
