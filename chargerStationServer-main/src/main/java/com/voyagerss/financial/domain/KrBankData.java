package com.voyagerss.financial.domain;

import lombok.NoArgsConstructor;
import javax.persistence.*;

@Entity
@NoArgsConstructor
@Table(name = "krbankdata")
public
class KrBankData {
        @Column(name = "id")
        @Id
        @GeneratedValue(strategy = GenerationType.AUTO)
        Long id;

        @Column(name = "UNIT_NAME")
        String unit_name;
        @Column(name = "STAT_NAME")
        String stat_name;
        @Column(name = "ITEM_CODE1")
        String item_code1;
        @Column(name = "STAT_CODE")
        String stat_code;
        @Column(name = "ITEM_CODE2")
        String item_code2;
        @Column(name = "ITEM_CODE3")
        String item_code3;
        @Column(name = "ITEM_NAME1")
        String item_name1;
        @Column(name = "ITEM_NAME2")
        String item_name2;
        @Column(name = "DATA_VALUE")
        String data_value;
        @Column(name = "ITEM_NAME3")
        String item_name3;
        @Column(name = "TIME")
        String  time;
}
