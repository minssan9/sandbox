package com.codility.test;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

import com.codility.TimeComplexity;

class TimeComplexityTest {

	@Test
	void test() {
		TimeComplexity timeC = new TimeComplexity();
//		fail("Not yet implemented");
		assertEquals(2, timeC.solution(10, 85, 30));
	}
	 
}
