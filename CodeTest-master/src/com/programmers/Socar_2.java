package com.programmers;

import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;

public class Socar_2 {

    @Test
    public void solution1_1() {
        int result = solution1(new int[]{10, 40, 30, 20}, 20);
        assertEquals(result, 1);
    }

    @Test
    public void solution1_2() {
        int result = solution1(new int[]{3, 7, 2, 8, 6, 4, 5, 1}, 3);
        assertEquals(result, 2);
    }

    public int solution1(int[] numbers, int k) {
        int answer = 0;

        Set<Integer> errorIdSet = new HashSet<>();
        for (int i = 0; i < numbers.length - 1; i++) {
            if (Math.abs(numbers[i] - numbers[i + 1]) > k) {
                errorIdSet.add(i);
                errorIdSet.add(i + 1);
            }
        }

        int[] newNumbers = numbers;

        while(errorIdSet.size() > 0 ){
            int i = errorIdSet.iterator().next();
            int tempOrigin = newNumbers[i];

            for (int j = i; j < numbers.length -1; j++) {
                int tempMinus = newNumbers[j];
                if (Math.abs(tempOrigin - tempMinus) <= k && i != j){
                    // swap
                    newNumbers[i] = tempMinus;
                    newNumbers[j] = tempOrigin;
                    if (validNear(newNumbers, j, k) &&  validNear(newNumbers, i, k)) {
                        errorIdSet.remove(i);
                        answer++;
                        break;
                    }else {
                        newNumbers[i] = tempOrigin;
                        newNumbers[j] = tempMinus;
                    }
                }
            }
            errorIdSet.remove(i);
            if (valid(newNumbers, k)) break;
        }

        if(answer == 0) return -1;
        return answer;
    }


    boolean validNear(int[] numbers, int checkId, int k) {
        boolean result = true;

        if (checkId - 1 > 0 && Math.abs(numbers[checkId] - numbers[checkId - 1]) > k) result = false;
        if (checkId + 1 < numbers.length && Math.abs(numbers[checkId] - numbers[checkId + 1]) > k) result = false;
        return result;
    }

    boolean valid(int[] numbers, int k) {
        boolean result = true;
        for (int i = 0; i < numbers.length - 1; i++) {
            if (Math.abs(numbers[i] - numbers[i + 1]) > k) result = false;
        }
        return result;
    }
}
