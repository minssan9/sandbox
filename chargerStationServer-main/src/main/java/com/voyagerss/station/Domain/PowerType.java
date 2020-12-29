package com.voyagerss.station.Domain;

import com.fasterxml.jackson.annotation.JsonBackReference;
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
    private int volt;

    @JsonBackReference
    @OneToOne(mappedBy = "powerType" )
    private Charger charger;
 }
