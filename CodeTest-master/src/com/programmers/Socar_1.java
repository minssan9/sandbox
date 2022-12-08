package com.programmers;

import org.junit.jupiter.api.Test;

import java.util.*;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.*;

public class Socar_1 {

    @Test
    public void solution2_1(){
        int[] result = solution1(6,17, new int[][]{{5,4,6},{5,2,5},{0,4,2},{2,3,3},{1,2,7},{0,1,3}});
        assertArrayEquals(result, new int[]{1,2,3});
    }

    @Test
    public void solution2_2(){
        int[] result = solution1(4,10,new int[][]{{0,1,2},{0,2,3}});
        assertArrayEquals(result, new int[]{0,1});
    }

    @Test
    public void solution2_3(){
        int[] result = solution1(4,11,new int[][]{{0,1,2},{1,2,7},{2,3,10},{3,0,9}});
        assertArrayEquals(result, new int[]{0,1});
    }


    List<Road> roadList = new ArrayList<>();
    Set<Integer> result = new HashSet<>();

    public int[] solution1( int n, int k , int[][] roads){
        int[] answer = {};
        Arrays.stream(roads).forEach(road ->{
            roadList.add(new Road(road[1], road[0], road[2]));
            roadList.add(new Road(road[0], road[1], road[2]));
        });

        roadList.stream()
                .filter(station -> station.from== 0)
                .forEach(station -> {
                    dfs(station, k);
                });
        answer = result.stream().mapToInt(Integer::intValue).toArray();
        if(result.size() == 0) answer = new int[]{-1};
        return answer;
    }

    public int dfs(Road road, int leftTime){
        if(leftTime < 0 || leftTime < road.distance) return leftTime;

        leftTime -= road.distance;
        if (leftTime == 0) {
            result.add(road.to);
        }

        List<Road> localRoadList = roadList.stream()
                .filter(rd -> rd.from== road.to).collect(Collectors.toList());

        for (Road st: localRoadList) {
            dfs(st, leftTime);
        }

        return leftTime;
    }

    class Road {
        public int from;
        public int to;
        public int distance;

        public Road(int from, int to, int distance) {
            this.from = from;
            this.to = to;
            this.distance = distance;
        }
    }
}
