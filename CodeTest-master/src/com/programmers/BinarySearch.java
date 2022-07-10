package com.programmers;

import java.util.*;

import org.junit.Assert;
import org.junit.jupiter.api.Test;


class BinarySearch {

    @Test
    public int[] solution(int[] answers) {
        int[] answer = {};
        int[] result1 = getWay1(answers.length);
        int[] result2 = getWay2(answers.length);
        int[] result3 = getWay3(answers.length);
        int result1Count = 0, result2Count = 0, result3Count = 0;

        for (int i = 0; i < answers.length; i++) {
            if ( answers[i] != result1[i]) result1Count++;
            if ( answers[i] != result2[i]) result2Count++;
            if ( answers[i] != result3[i]) result3Count++;
        }

        List<Result> resultList  = new ArrayList<>();
        resultList.add(new Result("1", result1Count));
        resultList.add(new Result("2", result2Count));
        resultList.add(new Result("3", result3Count));
        Collections.sort(resultList);

        Assert.assertEquals(answer, 1);
        return answer;
    }

    class Result implements Comparable<Result>{
        public Result(String name, Integer count) {
            this.name = name;
            this.count = count;
        }

        String name;
        Integer count;

        @Override
        public int compareTo(Result result) {
            if (result.count < count) {
                return 1;
            } else if (result.count > count) {
                return -1;
            }
            return 0;
        }
        @Override
        public String toString() {
            return "[ " + this.name + ": " + this.count + " ]";
        }

    }
    int[] getWay1(int size){
        int[] way = {};
        int answer = 1;
        for (int i = 0; i < size; i++) {
            way[i] = answer;
            answer++;
            if (answer > 5) answer = 1;
        }
        return way;
    }

    int[] getWay2(int size){
        int[] way = {};
        int answer = 1;
        for (int i = 0; i < size; i++) {
            if (i / 2 == 0){
                way[i] = 2;
            }else{
                way[i] = answer;
                answer++;
                if (answer == 2) answer++;
                if (answer > 5) answer = 1;
            }
        }
        return way;
    }

    int[] getWay3(int size){
        int[] way = {};
        int answer = 1;
        for (int i = 0; i < size; i++) {
            if (i / 2 == 0){
                way[i] = 2;
            }else{
                way[i] = answer;
                answer++;
                if (answer == 2) answer++;
                if (answer > 5) answer = 1;
            }
        }
        return way;
    }
}
