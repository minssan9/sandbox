package com.codility;

import java.util.HashSet;
import java.util.Set;

public class Demo {
	public int solution(int[] A) {
		Set setA = new HashSet();
		
		for(int i=0;i< A.length; i++) {
			if (!(A[i]>= -1000000 && A[i] < 100000)) return 0;
			setA.add(A[i]);			
		}
		int comparator = 1;
		int ret = 1; 
		while (comparator<=1000000) {
			if (!setA.contains(comparator)) {
				return comparator;								
			} 
			comparator++;
		}
		return 1; 		 
	};
	
}
