package com.voyagerss.financial.domain;

import lombok.NoArgsConstructor;

import javax.persistence.*;

@Entity
@NoArgsConstructor
@Table(name = "krbankschema")
public
class KrBankSchema {
        @Column(name = "id")
        @Id @GeneratedValue(strategy = GenerationType.AUTO)
        Long id;

        @Column(name = "CYCLE")
        String cycle;
        @Column(name = "ORG_NAME")
        String orgname;
        @Column(name = "P_STAT_CODE")
        String pstatcode; // *
        @Column(name = "SRCH_YN")
        String srchyn; // N
        @Column(name = "STAT_CODE")
        String statcode; // 000Y005
        @Column(name = "STAT_NAME")
        String statname; // 1.통화 및 유동성지표

}
