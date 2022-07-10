package com.todayHome;

import java.util.*;
import java.util.stream.Collectors;

import com.codility.Array2;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

public class q1 {


    public int solution1(int[] prefer, int[] coffees) {
        int answer = 0;

        Arrays.sort(prefer);
        Arrays.sort(coffees);

        for (int i = 0; i < coffees.length; i++) {
            if(prefer[i] < coffees[i]) {
                answer += coffees[i] - prefer[i];
            }
        }

        return answer;
    }


    public String solution2(String[] products, String[] purchased) {
        String answer = "";

        List<String> purchasedList = Arrays.asList(purchased);

        List<Product> productList = new ArrayList<>();
        for (String prd : products) {
            String[] prdArray = prd.split(" ");
            Set<String> properties = new HashSet<>();

            for (int i = 1; i < prdArray.length; i++) {
                properties.add(prdArray[i]);
            }
            Product product = new Product(prdArray[0], properties);
            productList.add(product);
        }

        List<Product> purchasedProducts  = productList.stream()
                .filter(product -> purchasedList.contains(product.name ))
                .collect(Collectors.toList());

        Map<String, Integer> preferMap = new HashMap<>();

        for (Product product: purchasedProducts) {
            for (String property:product.properties) {
                preferMap.put(property, preferMap.get(property) !=null ? preferMap.get(property) + 1 : 1);
            }
        }
        List<Map.Entry<String, Integer>> preferEntry = new LinkedList<>(preferMap.entrySet());
        preferEntry.sort(((o1, o2) -> o2.getValue() - o1.getValue()));
        List<String> preferList = preferEntry.stream().map(entry -> entry.getKey()).collect(Collectors.toList());

        List<Product> notPurchasedProducts = productList;
        notPurchasedProducts.removeAll(purchasedProducts);

//        for (Product product:notPurchasedProducts) {
            for (String prop: preferList) {
                List<Product> rcmd = notPurchasedProducts.stream()
                        .filter(product -> product.properties.contains(prop))
                        .collect(Collectors.toList());
                if( rcmd.size() == 1)
                    answer = rcmd.get(0).name;
            }
//        }

        return answer;
    }


    public class Product{
        String name;
        Set<String> properties;

        public Product(String name, Set<String> properties ) {
            this.name = name;
            this.properties = properties;
        }
        public Product(String name ) {
            this.name = name;
        }
    }
    @Test
    void test1() {
        q1 q1 = new q1();
        assertEquals(4, q1.solution1(new int[] {1,2,3,4}, new int[] {5,3,2,3})  );
    }
    @Test
    void test2() {
        q1 q1 = new q1();
        String[] prdArrays = {"sofa red long", "blanket blue long", "towel red", "mattress long", "curtain blue long cheap"};
        String[] purchasedArrays  = {"towel", "mattress", "curtain"};
        assertEquals("blanket", q1.solution2(prdArrays,	purchasedArrays	));
    }

}
