package com.mk.charger.station.Domain;

import lombok.Generated;
import lombok.NoArgsConstructor;

import javax.persistence.*;


@Entity
@NoArgsConstructor
@Table(name = "charger")
public class Charger {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "charger_id")
    private Long chargerId;


    private String chargerType;
    private String chargerOption;
    private String useStatus;

    @OneToOne
    private PowerType powerType;

    @ManyToOne(fetch = FetchType.LAZY)
    private Station station;
}
