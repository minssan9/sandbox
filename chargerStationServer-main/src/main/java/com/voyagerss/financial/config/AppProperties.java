package com.voyagerss.financial.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.PropertySource;
import org.springframework.stereotype.Component;

@Component
@PropertySource(value = {"classpath:account.properties"})
public class AppProperties {
    @Value("${krbankkey}")
    public static  String krbankkey;
}
