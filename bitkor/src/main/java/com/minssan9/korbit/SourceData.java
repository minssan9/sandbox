package com.minssan9.korbit;

import java.math.BigDecimal;
import java.text.SimpleDateFormat;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.Date;
import java.util.TimeZone;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class SourceData implements Comparable<SourceData> {
    private long timestamp;
    private int price ;
    private BigDecimal size;

    public SourceData(String[] sourceCsv) {
        this.timestamp = Integer.parseInt(sourceCsv[0]);
        this.price = Integer.parseInt(sourceCsv[1]);
        this.size = new BigDecimal(sourceCsv[2]) ;
    }

    @Override
    public int compareTo(SourceData o) {
        return (int) (this.getTimestamp() - o.getTimestamp());
    }
}
