package com.naverfn.test;

import org.junit.jupiter.api.Test;


import java.util.HashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;

class Test3 {
	@Test
	void test() {

//		assertEquals(7, solution(new int[] {4,2,3,7}, 2,2)  );
//		assertEquals(17, solution(new int[] {10,3,4,7}, 2,3)  );
		assertEquals(6, solution(new int[] {4,2,5,4,3,5,1,4,2,7}, 3,2)  );
	}

	public int solution(int[] A, int x, int y) {
		if (A.length < 2 && A.length > 200000) return -1;
		if (x < 2 && x > 200000) return -1;
		if (y < 1 && y > 199999) return -1;
		if (A.length <= (x-1)*y) return -1;

		int res = 0;
		int it = 0;
		int index = 0;

		int firstScope = (A.length + 1)- x * y;


		while(it < x){
			res = res + A[index];
			it++;
			index = index + y;
		}
		return res;
	}

	public Map<Integer, Integer> selectMinValue(int[] A, int x, int y){
		int firstScope = (A.length + 1)- x * y;
		int minFirstIndex = 0;
		for (int i = 0 ; i < firstScope; i++) {
			if ( A[minFirstIndex] >= A[i]) minFirstIndex = i;
		}
		Map resMap = new HashMap();
		resMap.put(minFirstIndex, A[minFirstIndex]);
		return resMap;
	}

}
