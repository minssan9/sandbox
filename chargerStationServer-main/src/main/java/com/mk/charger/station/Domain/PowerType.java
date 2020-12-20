package com.mk.charger.station.Domain;

import lombok.Data;

import javax.persistence.*;

@Data
@Entity
@Table(name = "powertype")
public class PowerType {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "powertype_id")
    private Long id;

    private String powertype;
    private String volt;

    @OneToOne(cascade = CascadeType.ALL)
    private Charger charger;
 }
