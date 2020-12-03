package com.codility;

public class TimeComplexity {
  
	public int solution(int X, int Y, int D) {
		int cnt = 0;
		cnt = (int) Math.ceil(( Y-X)*1.0 / D*1.0);
		return cnt;		
	}

}
