package com.minssan9.korbit;

import au.com.bytecode.opencsv.CSVReader;
import java.io.FileReader;
import java.io.IOException;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

public class Process {
    // wholeList / period = List<SourceData> -> targetData
    public List<TargetData> getSubListPerTargetByList(String fileName, int period)
        throws IOException, NullPointerException {
        CSVReader reader = new CSVReader(new FileReader(fileName));
        List<String[]> dividedList =  reader.readAll();
        return getTargetDataList(period, dividedList);
    }

    private List<TargetData> getTargetDataList(int period, List<String[]> dividedList) {
        List<TargetData> resultList = new ArrayList<>();
        List<SourceData> sdList = new ArrayList<>();

        dividedList.forEach(row -> {
            sdList.add(new SourceData(row));
        });

        long currentTime;
        long periodStart = sdList.get(0).getTimestamp();
        long periodEnd = periodStart + period;
        int currentIndex = 0;

        for (long i = sdList.get(0).getTimestamp();
            i < sdList.get(sdList.size() - 1).getTimestamp(); i = i + period) {
            List<SourceData> subList = new ArrayList<>();
            TargetData targetData = new TargetData();

            periodStart = i;
            periodEnd = i + period;

//            System.out.println(" //  start Time " + new Timestamp(periodStart).toLocalDateTime());
            while (currentIndex < sdList.size() &&
                sdList.get(currentIndex).getTimestamp() >= periodStart
                && sdList.get(currentIndex).getTimestamp() < periodEnd
            ) {
                currentTime = sdList.get(currentIndex).getTimestamp();
                subList.add(sdList.get(currentIndex));
                currentIndex++;

//                System.out.print(" //  data index " + currentIndex);
//                System.out.println(" //  time " + new Timestamp(currentTime).toLocalDateTime());
            }
//            System.out.println(" //  end TIme " + new Timestamp(periodEnd).toLocalDateTime());

            targetData = getTargetData(subList, periodStart, periodEnd);
            resultList.add(targetData);
        }
        return resultList;
    }

    public TargetData getTargetData(List<SourceData> sourceData, long periodStart, long periodEnd ) {
        TargetData targetData = new TargetData();
        targetData.setStart(periodStart);
        targetData.setEnd(periodEnd);

        if (sourceData.size() > 0) {
            targetData.setOpen(Integer.toString(sourceData.get(0).getPrice()));
            targetData.setClose(Integer.toString(sourceData.get(sourceData.size() - 1).getPrice()));
            targetData.setHigh(
                sourceData.stream().filter(Objects::nonNull).mapToInt(s -> s.getPrice()).max()
                    .toString());
            targetData.setLow(sourceData.stream().mapToInt(s -> s.getPrice()).min().toString());
            targetData.setStart(sourceData.get(0).getTimestamp());
            targetData.setEnd(sourceData.get(sourceData.size() - 1).getTimestamp());
            targetData
                .setAverage(sourceData.stream().mapToInt(s -> s.getPrice()).average().toString());
            targetData.setWeighted_average( getWeightAverage(sourceData));
            targetData.setVolume(
                sourceData.stream().map(s -> s.getSize()).reduce(BigDecimal.ZERO, BigDecimal::add)
                    .toString());
        }
        return targetData;
    }

    private String getWeightAverage(List<SourceData> sourceData) {
        float totalSum = 0;
        float sizeSum = 0;
        for (SourceData s : sourceData) {
            totalSum += s.getSize().floatValue() * s.getPrice();
            sizeSum += s.getSize().floatValue();
        }
        String weightAverage =  new BigDecimal(totalSum / sizeSum).toString();
        return weightAverage;
    }
}
