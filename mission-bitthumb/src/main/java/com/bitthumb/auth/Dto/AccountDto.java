package com.bitthumb.auth.Dto;

import com.bitthumb.auth.Domain.Account;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AccountDto {
    private String loginId;
    private String password;
    private String name;
}
