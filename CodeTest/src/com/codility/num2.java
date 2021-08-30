package com.codility;

import java.util.*;

public class num2 {
    public int solution(String S) {
        // write your code in Java SE 8
        Set<Character> m = new HashSet<>();

        char[] str= S.toCharArray();
        for(int i=0; i< S.length();i++) {
            if(!m.contains(S.charAt(i))){
                m.add(S.charAt(i));
            }else{
                m.remove(S.charAt(i));
            }
        }

        return m.size();
    }
}
