package com.codility.test;

import com.codility.PermMissingElem;
import com.codility.RamenFac;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

public class RamenFacTest {
    @Test
    void test() {
        RamenFac test = new RamenFac();
//		fail("Not yet implemented");

        assertEquals(2, test.solution(4, new int[] {4, 10 ,15}, new int[] {20, 5, 10}, 30));
    }

}
