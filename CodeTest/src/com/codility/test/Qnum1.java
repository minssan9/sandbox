package com.codility.test;

import org.junit.Assert;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;

public class Qnum1 {

    public static int solution2(String str) {
        int startIndex = 0;

        int count = 0;
        char before = 'z';

        List<Character> charList = new ArrayList<>(2);
        StringBuilder sb = new StringBuilder(str);

        for (int i = 0; i < sb.length() - 1; i++) {
            char ch = sb.charAt(i);
            if (before != ch) {
                charList.clear();
                charList.add(ch);
                before = ch;
                startIndex = i;
            } else {
                if (charList.size() == 2) {
                    charList.clear();
                    if (str.length() - 1 >= i + 2) {
                        char after1 = sb.charAt(i + 1);
                        char after2 = sb.charAt(i + 2);

                        if (after1 != ch && after1 == after2) {
                            sb.setCharAt(startIndex, after1);
                            count++;
                        } else {
                            if (startIndex - 2 >= 0) {
                                char before1 = sb.charAt(i - 1);
                                char before2 = sb.charAt(i - 2);

                                if (before1 != ch && before1 == before2) {
                                    before = ch == 'a' ? 'b' : 'a';
                                    continue;
                                } else {
                                    sb.setCharAt(i, ch == 'a' ? 'b' : 'a');
                                    count++;
                                }
                            } else {
                                sb.setCharAt(i, ch == 'a' ? 'b' : 'a');
                                count++;
                            }
                        }
                    } else {
                        sb.setCharAt(i, ch == 'a' ? 'b' : 'a');
                        count++;
                    }
                    before = ch == 'a' ? 'b' : 'a';
                } else {
                    charList.add(ch);
                }
            }
        }

        System.out.println("####" + sb.toString() + "####");

        return count;
    }

    public int solution(String S) {
        int changeCount = 0 ;
        int startIndex, endIndex;
        char[] givenCharArray = S.toCharArray();
        for (int i = 0; i < givenCharArray.length; i++) {
            int consecutiveCount = 0;
            char[] checkString = S.substring(i).toCharArray();
            startIndex = i;

            for (int j = startIndex; j < checkString.length; j++) {
                if (j+1 < checkString.length &&  checkString[j] == checkString[ j+1 ]) {
                    consecutiveCount++;
                }
                if (consecutiveCount >= 3) {
                    consecutiveCount = 0;
                    changeCount++;
                    if (checkString[j] == 'a') {
                        checkString[j] = 'b';
                    } else {
                        checkString[j] = 'a';
                    }
                }
            }

        }
        return changeCount;
    }


    //            for(int j=startIndex; j<= endIndex; j++){
//        endIndex=i+j;
//        if (S.charAt(startIndex) == S.charAt(endIndex)){
//            startIndex = endIndex;
//            continue;
//        };
//    }
    @Test
    public void sol() {
        String test1 = "baaaaa";
        String test2 = "baaabbaabbba";
        String test3 = "baabab";

//        char startChar  = getStartChar(test1);

        int res1 = solution(test1);
        int res2 = solution(test2);
        int res3 = solution(test3);

        Assert.assertEquals(res1, 1);
        Assert.assertEquals(res2, 2);
        Assert.assertEquals(res3, 0);

    }
}