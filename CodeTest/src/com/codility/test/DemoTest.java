package com.codility.test;

import com.codility.Demo;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class DemoTest {



	@Test
	void test() {
		int testNum1=0;
		int testNum2=0;
		int testNum3=0;
		int testNum4=0;

		Demo demo= new Demo();
		assertEquals(1, demo.solution(new int[] {-1,-3})  );
		
//		fail("Not yet implemented");
	}

}
