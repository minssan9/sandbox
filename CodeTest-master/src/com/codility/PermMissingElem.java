package com.codility;

import java.util.HashSet;
import java.util.Set;

public class PermMissingElem {
	public int solution(int[] A) {
		Set list = new HashSet();
		
		for(int i=1; i < A.length + 1;i++) {
			list.add(A[i-1]);			
		}
		for(int i=1; i < A.length + 1;i++) {
			if(!list.contains(i)) {
				return i;
			};		
		} 
		
		return 0;
	}; 
}
