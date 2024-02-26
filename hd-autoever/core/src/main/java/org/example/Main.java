package org.example;

import java.util.*;

public class Main {
    public static void main(String[] args) {
//        question2();
//        question3();

        Scanner sc = new Scanner(System.in);

        String strX = sc.nextLine().trim();
        String strY = sc.nextLine().trim();

        Set<String> setCombinationStrX = generateAllSubstrings(strX);
        Set<String> setCombinationStrY = generateAllSubstrings(strY);
        setCombinationStrX.stream().sorted((o1, o2) -> {
            if (o1.length() == o2.length()) {
                return o1.compareTo(o2);
            } else {
                return Integer.compare(o1.length(), o2.length());
            }
        });
        setCombinationStrY.stream().sorted((o1, o2) -> {
            if (o1.length() == o2.length()) {
                return o1.compareTo(o2);
            } else {
                return Integer.compare(o1.length(), o2.length());
            }
        });

        // Set<String> 두개 비교해서 같은 것 중에 가장 긴 데이터 찾기
        String result = "";
        for (String str : setCombinationStrX) {
            if (setCombinationStrY.contains(str) && str.length() > result.length()) {
                result = str;
            }
        }

        System.out.println(result);
    }


    static void question2() {
        System.out.println("Hello world!");
        /*Scanner sc = new Scanner(System.in);

        if( sc.nextLine().length() > 100) {
            System.out.println("Too long");
            return ;
        }*/
        Scanner sc = new Scanner(System.in);
        int length = Integer.parseInt(sc.nextLine());
        int[] arrSize = Arrays.stream(sc.nextLine().split(" ")).map(String::trim).mapToInt(Integer::parseInt).toArray();
        int[] arrType = Arrays.stream(sc.nextLine().split(" ")).map(String::trim).mapToInt(Integer::parseInt).toArray();

        int cost = 0;

        for(int i = 0; i < length; i++) {
            for(int j = 0; j < length - 1; j++) {
                if(arrSize[j] > arrSize[j+1]) {
                    int temp = arrSize[j];
                    arrSize[j] = arrSize[j+1];
                    arrSize[j+1] = temp;

                    temp = arrType[j];
                    arrType[j] = arrType[j+1];
                    arrType[j+1] = temp;

                    if(arrType[j] == arrType[j+1]) {
                        cost += 1;
                    }
                }
            }
        }
        System.out.println(cost);
    }
    static void question3() {

        Scanner sc = new Scanner(System.in);

        String strX = sc.nextLine().trim();
        if (strX.length() < 2 || strX.length() > 500) return;



    }

//
//    private static Set<String> generateAllSubstrings(String input) {
//        Set<String> result = new HashSet<>();
//
//        for (int i = 0; i < input.length(); i++) {
//            for (int j = i + 1; j <= input.length(); j++) {
//                result.add(input.substring(i, j));
//            }
//
//            for (int j = i + 1; j <= input.length(); j++) {
//                result.add(input.substring(i, j));
//            }
//        }
//
//        return result;
//    }

    private static List<String> generateAllCombinations(String input) {
        List<String> result = new ArrayList<>();
        generateCombinations("", input, result);
        return result;
    }


    private static Set<String> generateAllSubstrings(String input) {
        Set<String> result = new HashSet<>();

        for (int i = 0; i < input.length(); i++) {
            for (int j = i + 1; j <= input.length(); j++) {
                for (int k = i; k < j; k++) {
                    StringBuilder sb = new StringBuilder();
                    for (int m = i; m < j; m += k - i + 1) {
                        sb.append(input.charAt(m));
                    }
                    result.add(sb.toString());
                    result.addAll(generateAllCombinations(sb.toString()));
                }
            }
        }

        return result;
    }

    private static void generateCombinations(String prefix, String remaining, List<String> result) {
        int n = remaining.length();
        if (n == 0) {
            result.add(prefix);
        } else {
            for (int i = 0; i < n; i++) {
                generateCombinations(prefix + remaining.charAt(i), remaining.substring(0, i) + remaining.substring(i + 1, n), result);
            }
        }
    }
}