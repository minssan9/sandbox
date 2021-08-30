package com.naverfn.test;

import org.junit.jupiter.api.Test;

import java.util.*;

import static org.junit.jupiter.api.Assertions.assertEquals;

class Test1 {
	@Test
	void test() {

//		assertEquals(3, solution(new int[] {3,8,2,3,3,2})  );
		assertEquals(3, solution(new int[] {3,1,4,1,5})  );
	}

	public int solution(int[] A) {
		Map numCountMap = new HashMap<Integer, Integer>();
		for (int i: A) {
			int savedValue = 0;
			if ( numCountMap.get(i) != null) {
				savedValue = (int) numCountMap.get(i);
			}
			numCountMap.put(i, savedValue + 1);

		}

		HashSet removeSet = new HashSet();

		numCountMap.forEach((key1, value1) -> {
			if ( key1 != value1 ){
				removeSet.add(key1);
			}
		});

		removeSet.forEach(o -> {
			numCountMap.remove(o);
		});

		if (numCountMap.size() == 0) return 0;

		Map<Integer, Integer> reverseSortedMap = new TreeMap<Integer, Integer>(Collections.reverseOrder());
		reverseSortedMap.putAll(numCountMap);
		Map.Entry<Integer, Integer> resultValue = reverseSortedMap.entrySet().iterator().next();

		return resultValue.getValue();
	}

}
