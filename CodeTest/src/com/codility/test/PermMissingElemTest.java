package com.codility.test;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

import com.codility.PermMissingElem;
import com.codility.TimeComplexity;

class PermMissingElemTest {

	@Test
	void test() {
		PermMissingElem test = new PermMissingElem();
//		fail("Not yet implemented");
		assertEquals(4, test.solution(new int[] {2,3,1,5}));
	}
	 
}
