package com.kakao.test;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class Test4 {
    @Test
    void test() {

//        assertEquals(3, solution(437674,3));
//        assertEquals(2, solution(110011,10));
//		assertEquals(17, solution(new int[] {10,3,4,7}, 2,3)  );
//		assertEquals(6, solution(new int[] {4,2,5,4,3,5,1,4,2,7}, 3,2)  );
    }

    public int[] solution(int n, int[] info) {
        int[] answer = {};
        if (!(1<= n && 10 >= n )) return answer;
//
//        info
//
//        while( n>0){
//            info[0]
//
//            n--;
//        }

        return answer;
    }


    public String changeNumber(int value, int n) {
        StringBuilder builder = new StringBuilder();
        while (value >= 1) {
            builder.insert(0, value % n);
            value /= n;
        }
        return builder.toString();
    }
}
