package com.kakao.test;

import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.assertEquals;

class Test2 {
    @Test
    void test() {

//        assertEquals(3, solution(437674,3));
//        assertEquals(2, solution(110011,10));
        assertEquals(0, solution(2333321,6));
//		assertEquals(17, solution(new int[] {10,3,4,7}, 2,3)  );
//		assertEquals(6, solution(new int[] {4,2,5,4,3,5,1,4,2,7}, 3,2)  );
    }

    public int solution(int n, int k) {
        if (!(3<= k && 10 >= k )) return -1;
        int answer = -1;
        answer = 0;

        String numString = changeNumber(n, k);
        String[] primeNumbers = numString.replaceAll("00", "0").split("0");


        for (int i = 0; i < primeNumbers.length; i++) {
            if (!primeNumbers[i].equals("1") ){
                answer++;
            }
        }
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

//
//    문제 설명
//    문제 설명
//    양의 정수 n이 주어집니다. 이 숫자를 k진수로 바꿨을 때, 변환된 수 안에 아래 조건에 맞는 소수(Prime number)가 몇 개인지 알아보려 합니다.
//
//        0P0처럼 소수 양 쪽에 0이 있는 경우
//        P0처럼 소수 오른쪽에만 0이 있고 왼쪽에는 아무것도 없는 경우
//        0P처럼 소수 왼쪽에만 0이 있고 오른쪽에는 아무것도 없는 경우
//        P처럼 소수 양쪽에 아무것도 없는 경우
//        단, P는 각 자릿수에 0을 포함하지 않는 소수입니다.
//        예를 들어, 101은 P가 될 수 없습니다.
//        예를 들어, 437674을 3진수로 바꾸면 211020101011입니다. 여기서 찾을 수 있는 조건에 맞는 소수는 왼쪽부터 순서대로 211, 2, 11이 있으며, 총 3개입니다. 211은 P0 형태에서 찾을 수 있으며, 2는 0P0에서, 11은 0P에서 찾을 수 있습니다.
//
//        정수 n과 k가 매개변수로 주어집니다. n을 k진수로 바꿨을 때, 변환된 수 안에서 찾을 수 있는 위 조건에 맞는 소수의 개수를 return 하도록 solution 함수를 완성해 주세요.
//
//        제한사항
//        1 ≤ n ≤ 1,000,000
//        3 ≤ k ≤ 10
//        입출력 예
//        n	k	result
//        437674	3	3
//        110011	10	2
//        입출력 예 설명
//        입출력 예 #1
//
//        문제 예시와 같습니다.
//
//        입출력 예 #2
//
//        110011을 10진수로 바꾸면 110011입니다. 여기서 찾을 수 있는 조건에 맞는 소수는 11, 11 2개입니다. 이와 같이, 중복되는 소수를 발견하더라도 모두 따로 세어야 합니다.
//
//        제한시간 안내
//        정확성 테스트 : 10초
