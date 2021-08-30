package com.naverfn.test;

import org.junit.jupiter.api.Test;

import java.util.*;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.assertEquals;

class Test2 {
	@Test
	void test() {

		assertEquals(3, solution(new int[] {3,4,5,3,7}  ));
//		assertEquals(17, solution(new int[] {10,3,4,7}, 2,3)  );
//		assertEquals(6, solution(new int[] {4,2,5,4,3,5,1,4,2,7}, 3,2)  );
	}

	public int solution(int[] A) {
		if (A.length < 4 && A.length > 200) return -1;
		for (int i = 0; i < A.length; i++) {
			if ( A[i]< 1 && A[i] > 1000) return -1;
		}

		int cnt = 0;

		boolean isSorted = checkArray(A);
		boolean isSortedBigger = checkSortedBigger(A);
		boolean isSortedSmaller = checkSortedSmaller(A);

		if(isSortedBigger || isSortedSmaller) return -1;

		if (isSorted) {
			return 0;
		}else if (isSorted == false) {
			List<Integer> list = Arrays.stream(A).boxed().collect(Collectors.toList());

			for (int i = 0; i < list.size(); i++) {
				List<Integer> checkList = new ArrayList<>();
				Collections.copy(list, checkList);

				checkList.remove(i);
				int[] checkListArray = list.stream().mapToInt(v->v).toArray();
				if (checkArray(checkListArray)) cnt++;
			}
		}

		return cnt;
	}

	public boolean checkArray(int[] A){
		boolean biggerThanBeforeFlag1 = false;

		if (A[0] < A[1] ) biggerThanBeforeFlag1 = true;

		for ( int i = 1; i < A.length - 1 ; i++){
			if(A[i] < A[i + 1] == biggerThanBeforeFlag1) return false;
			if (A[i] < A[i + 1] != biggerThanBeforeFlag1) {
				biggerThanBeforeFlag1 = !biggerThanBeforeFlag1;
			}

		}

		return biggerThanBeforeFlag1;
	}

	public boolean checkSortedBigger(int[] A){
		int cnt = 0;

		if (A[0] < A[1] ) {
			cnt++;
		}

		for ( int i = 1; i < A.length - 1 ; i++){
			if (A[i] < A[i + 1] ) {
				cnt++;
			}else{
				cnt = 0;
			}
		}
		if (A.length - 1 == cnt) return true;
		return false;
	}

	public boolean checkSortedSmaller(int[] A){
		int cnt = 0;

		if (A[0] > A[1] ) {
			cnt++;
		}

		for ( int i = 1; i < A.length - 1 ; i++){
			if (A[i] > A[i + 1] ) {
				cnt++;
			}else{
				cnt = 0;
			}
		}
		if (A.length - 1 == cnt) return true;
		return false;
	}
}
