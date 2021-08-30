package com.codility.test;

import org.junit.Assert;
import org.junit.jupiter.api.Test;

import java.util.HashSet;
import java.util.Set;

public class Qnum2 {


    public int solution(int[] A){
        int res = 0;

        int turnOnCount=0;
        Set<Integer> sorted = new HashSet<>();
        Set<Integer> given= new HashSet<>();

        for(int i=0; i< A.length; i++){
            sorted.add(i+1);
            given.add(A[i]);
            String sortedString = sorted.toString();
            String givenString = given.toString();
            if (sortedString.equals(givenString)) {
                turnOnCount++;
            }
        }

        return turnOnCount ;
    }


    @Test
    public void sol (){
        int[] test1 = {2,1,3,5,4};
        int[] test2 = {2,3,4,1,5};
        int[] test3 = {1,3,4,2,5} ;

        int res1 =  solution(test1 );
        int res2 =  solution(test2 );
        int res3 =  solution(test3 );

        Assert.assertEquals(res1, 3);
        Assert.assertEquals(res2, 2);
        Assert.assertEquals(res3, 3);

    }
}