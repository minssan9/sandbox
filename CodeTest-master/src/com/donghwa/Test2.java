package com.donghwa;

import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

import static org.junit.jupiter.api.Assertions.assertNotNull;


class Test2 {

    @Test
    public void assertion(){
        int result = solution( new int[][]{{1, 19, 20, 8, 25}, {21, 4, 3, 17, 24}, {12, 5, 6, 16, 15}, {11, 18, 10, 9, 23}, {7, 13, 14, 22, 2}});
        assertNotNull(result);
    }

    public int solution(int[][] matrix) {
        int answer = 0;
        ArrayList<int[]> resultList = new ArrayList<>();
        ArrayList<int[]> medianRowList2 = new ArrayList<>();
        ArrayList<int[]> medianColList = new ArrayList<>();

        for (int i = 0; i < matrix.length; i++) {
            int [] arrayRow = getMedianRow(i, matrix[i]);
            medianRowList2.add(arrayRow);
        }

        for (int i = 0; i < matrix.length; i++) {
            int [] arrayCol = getMedianCol(i, getColumn(matrix, i));
            medianColList.add(arrayCol);
        }
        for (int[] rowItem: medianRowList2) {
            Boolean isExist = medianColList.stream()
                    .filter(colItem -> Arrays.equals(colItem, rowItem))
                    .findAny().isPresent();
            if(isExist) {
                resultList.add(rowItem);
            }
        }

        return resultList.size();
    }

    int[] getColumn(int[][] matrix, int column) {
        return IntStream.range(0, matrix.length)
                .map(i -> matrix[i][column]).toArray();
    }

    private static int[] getMedianRow(int row, int[] arrayInt) {
        int[] calArray = Arrays.copyOf(arrayInt, arrayInt.length);
        Arrays.sort(calArray);//오름차순 정렬
        int size = calArray.length;
        int result;
        int m = size / 2;
        result = calArray[m]; //중앙값
        int col = Arrays.stream(arrayInt)                     // IntStream
                .boxed()                        // Stream<Integer>
                .collect(Collectors.toList())   // List<Integer>
                .indexOf(result);
        return new int[] {row, col};
    }

    private static int[] getMedianCol(int col, int[] arrayInt) {
        int[] calArray = Arrays.copyOf(arrayInt, arrayInt.length);
        Arrays.sort(calArray);//오름차순 정렬
        int size = calArray.length;
        int result;
        int m = size / 2;
        result = calArray[m]; //중앙값
        int row = Arrays.stream(arrayInt)                     // IntStream
                .boxed()                        // Stream<Integer>
                .collect(Collectors.toList())   // List<Integer>
                .indexOf(result);
        return new int[] {row, col};
    }



}
