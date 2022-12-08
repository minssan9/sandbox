package com.minssan9.korbit;

import java.io.IOException;
import java.util.List;


public class KorbitApplication {
    public static void main(String[] args) throws IOException {
        Process process = new Process();

        String fileName = "src/main/resources/korbitKRW.csv";
        List<TargetData> targetData = process.getSubListPerTargetByList(fileName, 86400);
        System.out.println(targetData.toString());

    }

}
