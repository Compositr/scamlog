import FlexCenter from "@/common/components/base/flex/FlexCenter";
import FlexGrid from "@/common/components/base/flex/FlexGrid";
import useDebounce from "@/common/hooks/useDebounce";
import { StandardAPIResponse } from "@/common/types/api/StandardAPIResponse";
import {
  UserWithAdminUser,
  UserWithBansAndAdminUser,
} from "@/modules/auth/types/prisma/User";
import UserManageCard from "@/modules/cards/users/UserManageCard";
import DrawerLayout from "@/modules/dash/components/DrawerLayout";
import { User } from "@prisma/client";
import { useState } from "react";
import { Search } from "react-feather";
import { useQuery } from "react-query";

export default function Users() {
  const [nameSearch, setNameSearch] = useState("");

  const debouncedNameSearch = useDebounce(nameSearch, 300);

  const usersQuery = useQuery(
    ["users", debouncedNameSearch],
    (): Promise<null | StandardAPIResponse<UserWithBansAndAdminUser[]>> =>
      fetch(`/api/v1/users?name=${debouncedNameSearch}`, {
        credentials: "include",
      })
        .then((r) => r.json())
        .catch(() => null)
  );

  return (
    <DrawerLayout>
      <FlexCenter>
        <div className="input-group flex justify-center items-center mb-4">
          <input
            type={"text"}
            className="input input-bordered w-full md:w-1/2"
            value={nameSearch}
            placeholder="Search by name"
            onChange={(e) => setNameSearch(e.target.value)}
          />
          <button
            className="btn btn-square btn-primary"
            disabled={!debouncedNameSearch}
          >
            <Search />
          </button>
        </div>
        <FlexGrid>
          {usersQuery.data?.data?.length ? (
            usersQuery.data.data.map((user) => (
              <UserManageCard key={user.id} {...user} />
            ))
          ) : (
            <span>No users found</span>
          )}
        </FlexGrid>
      </FlexCenter>
    </DrawerLayout>
  );
}
