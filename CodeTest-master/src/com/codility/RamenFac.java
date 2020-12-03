package com.codility;

public class RamenFac {
    public int solution(int stock, int[] dates, int[] supplies, int k) {
        int arrCount = 0;

        for(int i=0;i<k; i++){
            if(arrCount<dates.length &&  dates[arrCount]==i){
                stock += supplies[arrCount];
                arrCount++;
            }
            stock--;
        }
        return arrCount;
    }

}
