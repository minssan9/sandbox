package com.mk.charger.station.Domain;

import lombok.Data;

import javax.persistence.*;

@Data
@Entity
@Table(name = "station", schema = "charger", catalog = "")
public class Station {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "statNm")
    private String statNm;
    @Column(name = "statId")
    private String statId;
    @Column(name = "chgerId")
    private String chgerId;
    @Column(name = "chgerType")
    private String chgerType;
    private String addr;
    private double lat;
    private double lng;
    @Column(name = "useTime")
    private String useTime;
    @Column(name = "busiId")
    private String busiId;
    @Column(name = "busiNm")
    private String busiNm;
    @Column(name = "busiCall")
    private String busiCall;
    private int stat;
    @Column(name = "statUpdDt")
    private String statUpdDt;
    @Column(name = "powerType")
    private String powerType;
 }
