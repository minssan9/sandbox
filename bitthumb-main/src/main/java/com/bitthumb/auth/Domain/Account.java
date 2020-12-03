package com.bitthumb.auth.Domain;

import com.bitthumb.auth.Dto.AccountDto;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import javax.persistence.*;
import java.time.LocalDateTime;

@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name="account")
public class Account {

	@Id @GeneratedValue
	private Long accountId;
	@Column(unique = true)
	private String loginId;
	private String password;
	private String name;
	private String token;
	private LocalDateTime lastLoginDate;

	public Account(AccountDto accountDto){
		loginId = accountDto.getLoginId();
		password = accountDto.getPassword();
		name =  accountDto.getName();
	}

}
