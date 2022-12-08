package com.minssan9.korbit;

import static org.junit.jupiter.api.Assertions.assertNotNull;

import java.io.IOException;
import java.util.List;
import org.junit.jupiter.api.Test;

class ProcessTest {
    Process process = new Process();

    @Test
    void convertCsvToClassTest() throws IOException {
        String fileName = "src/main/resources/korbitKRW.csv";
        List<TargetData> targetData = process.getSubListPerTargetByList(fileName, 86400);
        System.out.println(targetData.toString());
        assertNotNull(targetData);
    }
}
